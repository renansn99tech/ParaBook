    TABLE comunidades (
    Id_Comunidades int NOT NULL AUTO_INCREMENT,
    Nome varchar(45) DEFAULT NULL,
    Categorias varchar(45) DEFAULT NULL,
    Data_Criacao varchar(45) DEFAULT NULL,
    Descricao varchar(45) DEFAULT NULL,
    Membros varchar(45) DEFAULT NULL,
    PRIMARY KEY (Id_Comunidades)
    );

    TABLE comunidades_has_usuarios (
    Comunidades_Id_Comunidades int NOT NULL,
    Usuarios_Id_Usuarios int NOT NULL,
    Usuarios_Perfil_Id_Perfil int NOT NULL,
    PRIMARY KEY (Comunidades_Id_Comunidades, Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil),
    KEY fk_Comunidades_has_Usuarios_Usuarios1_idx (Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil),
    KEY fk_Comunidades_has_Usuarios_Comunidades1_idx (Comunidades_Id_Comunidades),
    CONSTRAINT fk_Comunidades_has_Usuarios_Comunidades1 
        FOREIGN KEY (Comunidades_Id_Comunidades) 
        REFERENCES comunidades (Id_Comunidades),
    CONSTRAINT fk_Comunidades_has_Usuarios_Usuarios1 
        FOREIGN KEY (Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil) 
        REFERENCES usuarios (Id_Usuarios, Perfil_Id_Perfil)
    );

    TABLE livros (
    Id_Livros int NOT NULL AUTO_INCREMENT,
    Nome varchar(45) DEFAULT NULL,
    Autor varchar(45) DEFAULT NULL,
    Data_Publicacao varchar(45) DEFAULT NULL,
    Genero varchar(45) DEFAULT NULL,
    Avaliacao varchar(45) DEFAULT NULL,
    ISBN varchar(45) DEFAULT NULL,
    Categorias_Id_Categorias int NOT NULL,
    PRIMARY KEY (Id_Livros, Categorias_Id_Categorias),
    KEY fk_Livros_Categorias1_idx (Categorias_Id_Categorias),
    CONSTRAINT fk_Livros_Categorias1 
        FOREIGN KEY (Categorias_Id_Categorias) 
        REFERENCES categorias (Id_Categorias)
    );

    TABLE perfil (
    Id_Perfil int NOT NULL AUTO_INCREMENT,
    Historico varchar(45) DEFAULT NULL,
    Descricao_Perfil varchar(45) DEFAULT NULL,
    PRIMARY KEY (Id_Perfil)
    );

    TABLE postagens (
    Id_Postagens int NOT NULL AUTO_INCREMENT,
    Titulo_Postagem varchar(45) DEFAULT NULL,
    Data_Hora varchar(45) DEFAULT NULL,
    Conteudo varchar(45) DEFAULT NULL,
    Usuarios_Id_Usuarios int NOT NULL,
    Usuarios_Perfil_Id_Perfil int NOT NULL,
    PRIMARY KEY (Id_Postagens, Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil),
    KEY fk_Postagens_Usuarios1_idx (Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil),
    CONSTRAINT fk_Postagens_Usuarios1 
        FOREIGN KEY (Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil) 
        REFERENCES usuarios (Id_Usuarios, Perfil_Id_Perfil)
    );

    TABLE usuarios (
    Id_Usuarios int NOT NULL AUTO_INCREMENT,
    Nome varchar(45) DEFAULT NULL,
    Email varchar(45) DEFAULT NULL,
    Data_Nascimento varchar(45) DEFAULT NULL,
    Senha varchar(45) DEFAULT NULL,
    Telefone varchar(45) DEFAULT NULL,
    Foto varchar(45) DEFAULT NULL,
    Descricao varchar(45) DEFAULT NULL,
    Conquistas varchar(45) DEFAULT NULL,
    Perfil_Id_Perfil int NOT NULL,
    PRIMARY KEY (Id_Usuarios, Perfil_Id_Perfil),
    KEY fk_Usuarios_Perfil_idx (Perfil_Id_Perfil),
    CONSTRAINT fk_Usuarios_Perfil 
        FOREIGN KEY (Perfil_Id_Perfil) 
        REFERENCES perfil (Id_Perfil)
    );

    TABLE usuarios_has_livros (
    Usuarios_Id_Usuarios int NOT NULL,
    Usuarios_Perfil_Id_Perfil int NOT NULL,
    Livros_Id_Livros int NOT NULL,
    Livros_Categorias_Id_Categorias int NOT NULL,
    PRIMARY KEY (
        Usuarios_Id_Usuarios,
        Usuarios_Perfil_Id_Perfil,
        Livros_Id_Livros,
        Livros_Categorias_Id_Categorias
    ),
    KEY fk_Usuarios_has_Livros_Livros1_idx (
        Livros_Id_Livros,
        Livros_Categorias_Id_Categorias
    ),
    KEY fk_Usuarios_has_Livros_Usuarios1_idx (
        Usuarios_Id_Usuarios,
        Usuarios_Perfil_Id_Perfil
    ),
    CONSTRAINT fk_Usuarios_has_Livros_Livros1 
        FOREIGN KEY (Livros_Id_Livros, Livros_Categorias_Id_Categorias) 
        REFERENCES livros (Id_Livros, Categorias_Id_Categorias),
    CONSTRAINT fk_Usuarios_has_Livros_Usuarios1 
        FOREIGN KEY (Usuarios_Id_Usuarios, Usuarios_Perfil_Id_Perfil) 
        REFERENCES usuarios (Id_Usuarios, Perfil_Id_Perfil)
    );

    TABLE categorias (
    Id_Categorias int NOT NULL AUTO_INCREMENT,
    Nome_Categoria varchar(45) DEFAULT NULL,
    PRIMARY KEY (Id_Categorias)
    );