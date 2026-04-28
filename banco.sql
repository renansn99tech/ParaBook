Table usuarios {
id int [pk, increment]
nome varchar(100)
email varchar(150) [unique]
senha number
perfil varchar(255)
descricao text
criado_em datetime
}

Table autores {
id int [pk, increment]
nome varchar(150)
}

Table livros {
id int [pk, increment]
titulo varchar(200)
descricao text
imagem varchar(255)
ano_publicacao int
isbn varchar(20) //identificador universal de livros
genero varchar(100)
livro_genero int 
autor_id int [ref: > autores.id]
}

Table user_livros {
id int [pk, increment]
usuario_id int [ref: > usuarios.id]
livro_id int [ref: > livros.id]
status enum("desejo ler", "lendo", "concluido", "desisti")
nota int
favorito boolean
atualizado_em datetime
}

Table reviews {
id int [pk, increment]
usuario_id int [ref: > usuarios.id]
livro_id int [ref: > livros.id]
nota
comentario
}

Table comunidades {
    id int [pk, increment]
    comunidades
    posts
    comentarios
}